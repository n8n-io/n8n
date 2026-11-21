"""Write normalized MatchRecords to the database. Idempotent by (source, external_id)."""

import re
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from footintel.catalog import (
    COUNTRY_BY_CODE,
    FOOTBALL_DATA_ORG,
    INTERNATIONAL,
    ONEFOOTBALL,
    OPENFOOTBALL,
    OPENLIGADB,
    OUTCOME_SOURCE_RANK,
    get_source,
)
from footintel.connectors.base import MatchRecord, season_label
from footintel.db.models import (
    Competition,
    DataSource,
    Match,
    MatchExternalRef,
    MatchOutcome,
    OddsSnapshot,
    Season,
    Team,
    TeamAlias,
    TeamMatchStatistics,
)
from footintel.ingestion.teams import TeamResolver, load_manual_aliases
from footintel.jobs import RunStats

SINGLE_PAIRING_LEAGUES = {"ENG-PL", "ESP-LL", "ITA-SA", "GER-BL", "FRA-L1"}

_STAT_FIELDS = ("shots", "shots_on_target", "corners", "fouls", "yellow_cards", "red_cards", "xg")


class MatchStore:
    """Holds lookup caches for one ingestion batch inside one session."""

    def __init__(self, session: Session, source_code: str):
        self.s = session
        self.source = get_source(session, source_code)
        # Names from openfootball must be mapped onto the football-data.co.uk teams.
        self.resolver = TeamResolver(session, source_code) if source_code == OPENFOOTBALL else None
        # OneFootball (D62): a league team must already exist; a cup may add a lower-tier club.
        self.calendar = source_code == ONEFOOTBALL
        self.calendar_resolver = TeamResolver(session, source_code) if self.calendar else None
        self.calendar_manual = ({a: t for (src, a), t in load_manual_aliases().items() if src == ONEFOOTBALL}
                                if self.calendar else {})
        # Names without a safe automatic match: only aliases checked by a human are used.
        self.manual_only = (
            {a: t for (src, a), t in load_manual_aliases().items() if src == source_code}
            if source_code in (OPENLIGADB, FOOTBALL_DATA_ORG) else None)
        # A checking source: it completes matches that exist, never creates teams or matches.
        self.attach_only = source_code == FOOTBALL_DATA_ORG
        self._ranks = {s.id: OUTCOME_SOURCE_RANK.get(s.code, 0)
                       for s in session.scalars(select(DataSource))}
        self._competitions = {c.code: c for c in session.scalars(select(Competition))}
        self._national: dict[str, int] | None = None  # results-file name -> team id, read on first use
        self._seasons = {(x.competition_id, x.label): x for x in session.scalars(select(Season))}
        self._aliases = {
            a.alias: a.team_id
            for a in session.scalars(select(TeamAlias).where(TeamAlias.source_id == self.source.id))
        }
        self._refs = dict(
            session.execute(
                select(MatchExternalRef.external_id, MatchExternalRef.match_id).where(
                    MatchExternalRef.source_id == self.source.id
                )
            ).all()
        )

    def _team_id(self, name: str, rec: MatchRecord, competition: Competition,
                 stats: RunStats) -> int:
        if competition.type == "national":
            return self._national_team(name, competition, stats)
        if name in self._aliases:
            return self._aliases[name]
        if self.attach_only:
            team = self.s.scalar(select(Team).where(Team.name == self.manual_only.get(name, "")))
            if team is None:
                stats.issue("warning", "unmapped_team", f"{name}: no manual alias, match skipped")
                return None
            self.s.add(TeamAlias(team_id=team.id, source_id=self.source.id, alias=name))
            self._aliases[name] = team.id
            return team.id
        if self.calendar:
            return self._calendar_team(name, rec, competition, stats)
        canonical, country = name, competition.country
        if self.resolver is not None:
            m = re.search(r"\(([A-Z]{3})\)$", name)
            country = COUNTRY_BY_CODE.get(m[1]) if m else None
            res = self.resolver.resolve(name, rec.season_start_year)
            if res.team_name:
                canonical = res.team_name
            else:
                stats.issue("info", "unmapped_team",
                            f"{name} ({rec.season_start_year}): no safe match"
                            + (f", closest {res.runner_up!r} at {res.score:.2f}" if res.runner_up else ""))
        elif self.manual_only is not None:
            if name in self.manual_only:
                canonical = self.manual_only[name]
            else:
                stats.issue("info", "unmapped_team",
                            f"{name} ({rec.season_start_year}): no manual alias, kept as a new team")
        team = self.s.scalar(select(Team).where(Team.name == canonical))
        if team is None:
            team = Team(name=canonical, country=country)
            self.s.add(team)
            self.s.flush()
        elif team.country is None and country:
            team.country = country
        self.s.add(TeamAlias(team_id=team.id, source_id=self.source.id, alias=name))
        self._aliases[name] = team.id
        return team.id

    def _national_team(self, name: str, competition: Competition, stats: RunStats) -> int | None:
        """National teams (D82) exist only through sync_international, under the name used in
        the results file. A name with no such team is skipped: a new team would start at the
        default rating and split the history of a real one."""
        from footintel.connectors.international import ONEFOOTBALL_NAMES

        if self._national is None:
            intl = get_source(self.s, INTERNATIONAL)
            self._national = dict(self.s.execute(select(TeamAlias.alias, TeamAlias.team_id)
                                                 .where(TeamAlias.source_id == intl.id)).all())
        canonical = ONEFOOTBALL_NAMES.get(name, name) if self.calendar else name
        team_id = self._national.get(canonical)
        if team_id is None:
            stats.issue("warning", "unmapped_team",
                        f"{competition.code} {name!r}: no national team of that name, match skipped")
        return team_id

    def _calendar_team(self, name: str, rec: MatchRecord, competition: Competition,
                       stats: RunStats) -> int | None:
        """Manual alias, exact name, then a safe similarity match among the country's league
        teams. In a league an unknown name is skipped: a wrong new team would corrupt the Elo."""
        canonical = self.calendar_manual.get(name)
        team = self.s.scalar(select(Team).where(Team.name == (canonical or name)))
        if team is None and competition.country:
            res = self.calendar_resolver.resolve_in_country(name, competition.country, rec.season_start_year)
            if res.team_name:
                team = self.s.scalar(select(Team).where(Team.name == res.team_name))
        if team is None and competition.type == "league":
            stats.issue("warning", "unmapped_team",
                        f"{competition.code} {name!r}: no manual alias or safe match, match skipped")
            return None
        if team is None:
            team = Team(name=name, country=competition.country)
            self.s.add(team)
            self.s.flush()
            stats.issue("info", "new_cup_team", f"{competition.code} {name!r}: new team (lower tier)")
        self.s.add(TeamAlias(team_id=team.id, source_id=self.source.id, alias=name))
        self._aliases[name] = team.id
        return team.id

    def _season(self, competition: Competition, start_year: int) -> Season:
        key = (competition.id, season_label(start_year))
        if key not in self._seasons:
            season = Season(competition_id=competition.id, label=key[1], start_year=start_year)
            self.s.add(season)
            self.s.flush()
            self._seasons[key] = season
        return self._seasons[key]

    def upsert(self, rec: MatchRecord, stats: RunStats) -> int:
        competition = self._competitions[rec.competition_code]
        season = self._season(competition, rec.season_start_year)
        home_id = self._team_id(rec.home_team, rec, competition, stats)
        away_id = self._team_id(rec.away_team, rec, competition, stats)
        if home_id is None or away_id is None:
            stats.skipped += 1
            return -1
        if home_id == away_id:
            stats.issue("error", "same_team", f"{rec.external_id}: both names map to one team")
            stats.skipped += 1
            return -1

        match_id = self._refs.get(rec.external_id)
        if match_id is None:
            match_id = self._same_match(competition, season.id, home_id, away_id, rec)
            if match_id is not None:
                self.s.add(MatchExternalRef(match_id=match_id, source_id=self.source.id,
                                            external_id=rec.external_id))
                self._refs[rec.external_id] = match_id
        # A checking source adds league fixtures (full calendar), never cup matches.
        if match_id is None and self.attach_only and competition.type != "league":
            if rec.status == "finished":
                stats.issue("warning", "match_not_found",
                            f"{rec.external_id}: {rec.home_team} - {rec.away_team} {rec.kickoff_date} "
                            "is in no other source; skipped")
            stats.skipped += 1
            return -1
        is_new = match_id is None
        changed = False
        if is_new:
            match = Match(
                competition_id=competition.id,
                season_id=season.id,
                home_team_id=home_id,
                away_team_id=away_id,
                kickoff_date=rec.kickoff_date,
                kickoff_utc=rec.kickoff_utc,
                status=rec.status,
                round=rec.round,
                neutral_venue=rec.neutral,
            )
            self.s.add(match)
            self.s.flush()
            match_id = match.id
            self.s.add(
                MatchExternalRef(match_id=match_id, source_id=self.source.id,
                                 external_id=rec.external_id)
            )
            self._refs[rec.external_id] = match_id
        else:
            match = self.s.get(Match, match_id)
            if match.kickoff_date != rec.kickoff_date or (
                rec.kickoff_utc is not None and match.kickoff_utc != rec.kickoff_utc
            ):
                match.kickoff_date = rec.kickoff_date
                match.kickoff_utc = rec.kickoff_utc or match.kickoff_utc
                changed = True
            if match.status != rec.status and rec.status in ("finished", "cancelled"):
                match.status = rec.status
                changed = True

        for code, message in rec.issues:
            stats.issue("warning", code, f"{rec.external_id}: {message}", match_id)

        if rec.outcome is not None:
            changed |= self._upsert_outcome(match_id, rec, is_new, stats)
            for team_id, is_home, st in ((home_id, True, rec.home_stats),
                                         (away_id, False, rec.away_stats)):
                if st is not None:
                    changed |= self._upsert_stats(match_id, team_id, is_home, st, is_new)
        changed |= self._upsert_odds(match_id, rec, is_new)

        if is_new:
            stats.inserted += 1
        elif changed:
            stats.updated += 1
        else:
            stats.skipped += 1
        return match_id

    def _same_match(self, competition: Competition, season_id: int, home_id: int, away_id: int,
                    rec: MatchRecord) -> int | None:
        """A match already imported from another source, reused so that two sources never
        create two matches. In the four target leagues a pairing is played once per season
        and venue, so the season identifies it even after a postponement; elsewhere the
        kick-off must be within two days (some context leagues repeat a pairing)."""
        q = select(Match.id).where(Match.competition_id == competition.id,
                                   Match.home_team_id == home_id, Match.away_team_id == away_id)
        if competition.code in SINGLE_PAIRING_LEAGUES:
            return self.s.scalar(q.where(Match.season_id == season_id))
        return self.s.scalar(q.where(Match.kickoff_date.between(
            rec.kickoff_date - timedelta(days=2), rec.kickoff_date + timedelta(days=2))))

    def _upsert_outcome(self, match_id: int, rec: MatchRecord, is_new: bool, stats: RunStats) -> bool:
        o = rec.outcome
        existing = None if is_new else self.s.scalar(
            select(MatchOutcome).where(MatchOutcome.match_id == match_id)
        )
        values = dict(home_goals=o.home_goals, away_goals=o.away_goals, result=o.result,
                      ht_home_goals=o.ht_home_goals, ht_away_goals=o.ht_away_goals,
                      aet_home_goals=o.aet_home_goals, aet_away_goals=o.aet_away_goals,
                      pen_home=o.pen_home, pen_away=o.pen_away, is_final=o.is_final)
        if existing is None:
            self.s.add(MatchOutcome(match_id=match_id, source_id=self.source.id, **values))
            return True
        diff = any(getattr(existing, k) != v for k, v in values.items())
        if existing.source_id != self.source.id:
            if diff:
                stats.issue("warning", "sources_disagree",
                            f"{rec.external_id}: {existing.home_goals}-{existing.away_goals} "
                            f"(HT {existing.ht_home_goals}-{existing.ht_away_goals}) elsewhere, "
                            f"{o.home_goals}-{o.away_goals} (HT {o.ht_home_goals}-{o.ht_away_goals}) here",
                            match_id)
            # A lower-ranked source never overwrites a result.
            if self._ranks.get(self.source.id, 0) < self._ranks.get(existing.source_id, 0):
                return False
            existing.source_id = self.source.id
        elif (existing.home_goals, existing.away_goals) != (o.home_goals, o.away_goals):
            stats.issue("warning", "outcome_changed",
                        f"{rec.external_id}: {existing.home_goals}-{existing.away_goals} -> "
                        f"{o.home_goals}-{o.away_goals}", match_id)
        for k, v in values.items():
            setattr(existing, k, v)
        return diff

    def _upsert_stats(self, match_id, team_id, is_home, st, is_new) -> bool:
        existing = None if is_new else self.s.scalar(
            select(TeamMatchStatistics).where(
                TeamMatchStatistics.match_id == match_id,
                TeamMatchStatistics.team_id == team_id,
                TeamMatchStatistics.source_id == self.source.id,
            )
        )
        values = {f: getattr(st, f) for f in _STAT_FIELDS}
        if existing is None:
            self.s.add(TeamMatchStatistics(match_id=match_id, team_id=team_id,
                                           source_id=self.source.id, is_home=is_home, **values))
            return True
        diff = any(getattr(existing, k) != v for k, v in values.items())
        for k, v in values.items():
            setattr(existing, k, v)
        return diff

    def _upsert_odds(self, match_id: int, rec: MatchRecord, is_new: bool) -> bool:
        existing = {}
        if not is_new:
            for o in self.s.scalars(select(OddsSnapshot).where(
                OddsSnapshot.match_id == match_id, OddsSnapshot.source_id == self.source.id
            )):
                existing[(o.bookmaker, o.market, o.selection, o.snapshot_label)] = o
        changed = False
        for odd in rec.odds:
            key = (odd.bookmaker, odd.market, odd.selection, odd.snapshot_label)
            row = existing.get(key)
            if row is None:
                self.s.add(OddsSnapshot(match_id=match_id, source_id=self.source.id,
                                        bookmaker=odd.bookmaker, market=odd.market,
                                        selection=odd.selection, price=odd.price,
                                        snapshot_label=odd.snapshot_label,
                                        captured_at=odd.captured_at))
                changed = True
            elif row.price != odd.price:
                row.price = odd.price
                changed = True
        return changed


def remove_stale_matches(session: Session, source_id: int, prefix: str,
                         seen_external_ids: set[str], stats: RunStats) -> int:
    """Delete matches of one source file that the latest read no longer contains
    (e.g. a date fixed by a parser correction, which changes the identity key).

    A match that carries a model or user prediction is never deleted: it is
    reported for a human decision instead."""
    from sqlalchemy import text

    rows = session.execute(text(
        "SELECT external_id, match_id FROM match_external_refs "
        "WHERE source_id = :s AND external_id LIKE :p"),
        {"s": source_id, "p": prefix + "%"}).all()
    stale = [(e, m) for e, m in rows if e not in seen_external_ids]
    removed = 0
    for external, match_id in stale:
        # The match is also known from another source or under a new id: drop the old link only.
        others = session.execute(text(
            "SELECT count(*) FROM match_external_refs WHERE match_id = :m AND NOT "
            "(source_id = :s AND external_id = :e)"), {"m": match_id, "s": source_id, "e": external}).scalar()
        if others:
            session.execute(text("DELETE FROM match_external_refs WHERE source_id = :s AND external_id = :e"),
                            {"s": source_id, "e": external})
            stats.issue("info", "stale_ref_removed", f"{external}: link removed, match kept")
            continue
        protected = session.execute(text(
            "SELECT (SELECT count(*) FROM predictions WHERE match_id = :m)"
            " + (SELECT count(*) FROM user_predictions WHERE match_id = :m)"), {"m": match_id}).scalar()
        if protected:
            stats.issue("error", "stale_match_with_predictions",
                        f"{external}: no longer in the source but has predictions; kept", match_id)
            continue
        for table in ("match_outcomes", "team_match_statistics", "odds_snapshots", "match_events",
                      "lineups", "team_match_tactics", "player_match_statistics",
                      "prediction_evaluations", "match_external_refs"):
            session.execute(text(f"DELETE FROM {table} WHERE match_id = :m"), {"m": match_id})
        for table in ("data_quality_issues", "injuries", "suspensions"):
            session.execute(text(f"UPDATE {table} SET match_id = NULL WHERE match_id = :m"),
                            {"m": match_id})
        session.execute(text("DELETE FROM matches WHERE id = :m"), {"m": match_id})
        stats.issue("warning", "stale_match_removed", f"{external}: removed, not in the latest file")
        removed += 1
    return removed
