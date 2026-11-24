"""Where the model goes wrong on this season, predicted out of sample, against the market.

The model is trained on seasons before the current one only, then predicts its matches, as
in markets_check.py. Writes the same section as the weekly report (analysis/errors.py) to
reports/errors_<season>.md and .html, and prints it.
Run from football-intel/: .venv/bin/python scripts/errors_check.py
"""

import sys
from datetime import date

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.analysis.errors import analyse, errors_markdown  # noqa: E402
from footintel.config import get_settings  # noqa: E402
from footintel.connectors.base import season_start_for  # noqa: E402
from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import walk_forward  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402
from footintel.reports.daily import _write  # noqa: E402

MODEL = "routed_competition"
season = season_start_for(date.today())
engine = get_engine()
preds = walk_forward(build_features(load_matches(engine)), [MODEL, "market_implied"], [season])
with engine.connect() as c:
    info = pd.read_sql(text("""
        SELECT m.id AS match_id, m.kickoff_date, c.code AS competition, c.name AS competition_name,
               th.name AS home, ta.name AS away, o.home_goals, o.away_goals, o.result
        FROM matches m JOIN competitions c ON c.id = m.competition_id
        JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
        JOIN match_outcomes o ON o.match_id = m.id"""), c)


def scored(model: str) -> pd.DataFrame:
    d = preds[preds.model == model].dropna(subset=["p_home"]).drop(
        columns=["competition", "kickoff_date", "home_goals", "away_goals"]).merge(info, on="match_id")
    p = np.select([d.result == "H", d.result == "D"], [d.p_home, d.p_draw], d.p_away)
    d["log_loss"] = -np.log(np.clip(p, 1e-15, 1))
    d["correct"] = d[["p_home", "p_draw", "p_away"]].to_numpy().argmax(axis=1) == d.result.map({"H": 0, "D": 1, "A": 2})
    return d


model = scored(MODEL)
market = scored("market_implied")[["match_id", "log_loss"]].rename(columns={"log_loss": "market_log_loss"})
df = model.merge(market, on="match_id", how="left")
df["kickoff_date"] = pd.to_datetime(df.kickoff_date).dt.date
e = analyse(df, df.kickoff_date.min(), df.kickoff_date.max())
title = f"Où le modèle se trompe, saison {season}-{(season + 1) % 100:02d} (hors échantillon)"
md = "\n".join([f"# {title}", "", f"Modèle `{MODEL}` entraîné sur les saisons antérieures seulement ; "
                f"matchs du {e['start']:%d/%m/%Y} au {e['end']:%d/%m/%Y}.", ""] + errors_markdown(e, title))
rep = _write(get_settings(), f"errors_{season}", md, title, df[["match_id", "competition", "log_loss", "market_log_loss"]])
print(md)
print({k: str(v) for k, v in rep.paths.items()})
