"""The week in plain French for the owner (D80): the weekly e-mail body.

It says what happened to his tickets and his teams, and whether the site did better than the
bookmakers, in short sentences. The technical report (calibration, drift, versions) stays as
an attachment for maintenance.
"""

from datetime import date

from footintel.analysis.tickets import FOLLOWED, _team_followed, national_followed
from footintel.notify.tickets import SITE

_STATE = {"gagné": "gagné ✅", "perdu": "perdu ❌", "en cours": "pas encore réglé ⏳"}


def _pct(p: float) -> str:
    return f"{round(100 * p)} %"


def _odds(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


def _ticket_line(t: dict) -> str:
    head = f"Ticket {t['tag']} · {t['name']} (cote {_odds(t['odds'])}, {len(t['legs'])} matchs) : {_STATE[t['state']]}"
    lost = [x for x in t["legs"] if x["won"] == 0]
    if lost:
        why = " ; ".join(f"{x['match']} {x['score']}, « {x['label']} »" for x in lost)
        return f"{head}\n   Raté : {why}."
    if t["state"] == "en cours":
        wait = ", ".join(x["match"] for x in t["legs"] if x["won"] is None)
        return f"{head}\n   En attente : {wait}."
    return head


def _favourite(probs: list[float], home: str, away: str) -> tuple[str, int, float]:
    i = max(range(3), key=lambda k: probs[k])
    return (home, "le nul", away)[i], i, probs[i]


def _is_mine(m: dict) -> bool:
    if m["competition"].startswith("INT-"):
        return national_followed(m | {"source": "marché" if m.get("market") else "modèle"})
    return m["competition"] in FOLLOWED and (_team_followed(m["home"], m["competition"])
                                             or _team_followed(m["away"], m["competition"]))


def plain_week(tickets: list[dict], matches: list[dict], today: date, retrained: bool = False) -> tuple[str, str]:
    """(subject, body). `tickets`: bilan.ticket_results; `matches`: bilan.forecast_results."""
    lines = [f"Ta semaine en clair — jusqu'au {today:%d/%m}", ""]

    played = [t for d in tickets for t in d["tickets"]]
    lines.append("1. TES TICKETS")
    if not played:
        lines.append("Aucun ticket cette semaine (pas de match de tes équipes, ou pas de cycle ce jour-là).")
    else:
        count = {s: sum(t["state"] == s for t in played) for s in _STATE}
        lines.append(f"{count['gagné']} gagné(s), {count['perdu']} perdu(s), {count['en cours']} pas encore réglé(s).")
        for d in tickets:
            if d["tickets"]:
                lines.append(f"\n{date.fromisoformat(d['date']):%d/%m} :")
                lines += [f" • {_ticket_line(t)}" for t in d["tickets"]]
    lines.append("")

    mine = [m for m in matches if _is_mine(m)]
    lines.append("2. TES ÉQUIPES : CE QUE LE SITE PRÉVOYAIT")
    if not mine:
        lines.append("Aucun match de tes équipes terminé cette semaine.")
    else:
        right = sum(m["model_right"] for m in mine)
        lines.append(f"Le site a vu juste {right} fois sur {len(mine)} (le bon gagnant, ou le nul).")
        missed = sorted((m for m in mine if not m["model_right"]), key=lambda m: m["date"])
        if missed:
            lines.append("Les ratés :")
        for m in missed:
            name, _, p = _favourite(m["model"], m["home"], m["away"])
            fav = "voyait le nul" if name == "le nul" else f"voyait {name} gagner"
            lines.append(f" ❌ {m['home']} – {m['away']} {m['score']} : le site {fav} ({_pct(p)}).")
    lines.append("")

    league = [m for m in matches if m["competition"] in FOLLOWED and m["market_right"] is not None]
    lines.append("3. LE SITE CONTRE LES BOOKMAKERS")
    if league:
        site, books = sum(m["model_right"] for m in league), sum(m["market_right"] for m in league)
        lines.append(f"Sur {len(league)} matchs de tes championnats, le site a trouvé le bon résultat "
                     f"{site} fois, les bookmakers {books} fois.")
        if abs(site - books) <= max(3, len(league) // 10):
            lines.append("C'est à égalité. Le site suit les bookmakers de près : il ne les bat pas.")
        else:
            better = "le site" if site > books else "les bookmakers"
            lines.append(f"Cette semaine, avantage {better}. Sur une seule semaine, c'est souvent le hasard.")
    else:
        lines.append("Pas assez de matchs terminés avec des cotes cette semaine.")
    lines.append("")

    lines.append("4. À RETENIR")
    if retrained:
        lines.append(" • Le modèle a été remis à jour avec les résultats de la semaine.")
    lines.append(" • Un pari ne vaut le coup que si betPawa paie plus que la « cote juste » du site.")
    lines.append(" • Moins de matchs dans un ticket = moins de marge perdue : préfère le ticket Court.")
    lines += ["", f"Tout le détail sur le site, onglet Bilan : {SITE}",
              "(La pièce jointe contient les détails techniques : tu peux l'ignorer.)"]

    won = sum(t["state"] == "gagné" for t in played)
    subject = f"Ta semaine — {won} ticket(s) gagné(s) sur {len(played)}" if played else "Ta semaine en clair"
    return subject, "\n".join(lines)
