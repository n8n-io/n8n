"""Lecture du jour (D77): one short analysis per competition, written by a language model from
the day's data only, then checked: a text with a figure that is not in its input is rejected.

Runs in the daily cycle after the tickets (`footintel write-lectures`). Writer, in order:
1. Claude Haiku, when ANTHROPIC_API_KEY is set (billed on that key);
2. GitHub Models (D78), when GITHUB_TOKEN is set: free and rate-limited, reached in GitHub
   Actions with the workflow token and the `models: read` permission;
3. none: skipped with one log line.
"""

import json
import logging
import os
import re
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import httpx

log = logging.getLogger(__name__)

MODEL = "claude-haiku-5-5"
# Small models of the GitHub Models catalog, tried in order. Free use allows 150 requests a
# day per small model; the lecture needs at most 6.
GITHUB_MODELS = ("openai/gpt-4.1-mini", "openai/gpt-4o-mini")
GITHUB_URL = "https://models.github.ai/inference/chat/completions"
FOLDER = "lectures"
# Groups follow the owner's leagues; cups are grouped by kind.
GROUPS = [("Premier League", ("ENG-PL",)), ("Bundesliga", ("GER-BL",)), ("Serie A", ("ITA-SA",)),
          ("Liga", ("ESP-LL",)), ("Ligue 1", ("FRA-L1",)),
          ("Coupes d'Europe", ("UEFA-CL", "UEFA-EL", "UEFA-ECL"))]

SYSTEM = """Tu es l'analyste football d'un parieur de Lubumbashi qui joue sur betPawa.
Tu écris la « lecture du jour » d'une compétition, en français simple, pour un téléphone.

Règles :
- 3 à 5 phrases, sans titre, sans liste, sans emoji.
- Utilise uniquement les faits et les chiffres des données fournies. N'écris aucun chiffre qui
  n'y figure pas exactement (pas de calcul, pas d'arrondi, pas de score prédit, pas de date).
- Dis quel match est le plus net, lequel est le plus incertain, et rappelle qu'un pari ne vaut
  le coup que si betPawa paie plus que la cote juste indiquée.
- Si des « remarques » sont fournies, explique-les simplement.
- Ne promets jamais un gain. Le modèle n'a pas d'avantage démontré sur les bookmakers."""

_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def _numbers(text: str) -> set[str]:
    return {n.replace(",", ".") for n in _NUM.findall(text)}


def check(text: str, data_json: str) -> list[str]:
    """Figures in `text` that do not appear in the data given to the model."""
    allowed = _numbers(data_json)
    return sorted(n for n in _numbers(text) if n not in allowed)


def _fmt_pct(p: float) -> str:
    return f"{round(100 * p)} %"


def group_inputs(day: dict) -> list[tuple[str, dict]]:
    """The data each analyst sees: the owner's matches of its competitions, pre-formatted, so
    every figure it may quote is written out once."""
    out = []
    for name, codes in GROUPS:
        rows = [m for m in day.get("matches", []) if m.get("followed") and m.get("competition") in codes]
        if not rows:
            continue
        matches = []
        for m in rows:
            alts = m.get("alternatives", [])[:4]
            matches.append({
                "match": m["match"],
                "heure_utc": (m.get("kickoff_utc") or "")[11:16],
                "paris_les_plus_surs": [{"pari": a["label"], "chances": _fmt_pct(a["prob"]),
                                          "cote_juste": f"{a['fair']:.2f}".replace(".", ",")} for a in alts],
                "remarques": [n["text"] for n in m.get("scenarios", [])],
            })
        out.append((name, {"competition": name, "date": day["date"], "matchs": matches}))
    return out


class GitHubModels:
    """GitHub Models behind the small part of the Anthropic client interface that `write` uses.
    The first model of `models` that the catalog accepts is kept for the following calls."""

    def __init__(self, token: str, models=GITHUB_MODELS, http=None):
        self.token, self.models, self.http = token, list(models), http or httpx.Client(timeout=60)
        self.messages = self
        self.model = self.models[0]

    def create(self, *, max_tokens, system, messages, **_):
        while True:
            r = self.http.post(GITHUB_URL, headers={"Authorization": f"Bearer {self.token}"},
                               json={"model": self.model, "max_tokens": max_tokens,
                                     "messages": [{"role": "system", "content": system}, *messages]})
            # An unknown or withdrawn model answers 400/404: try the next one.
            if r.status_code in (400, 404) and self.model != self.models[-1]:
                log.warning("GitHub Models: %s refused (%s), trying the next model", self.model, r.status_code)
                self.model = self.models[self.models.index(self.model) + 1]
                continue
            r.raise_for_status()
            choice = r.json()["choices"][0]
            stop = "end_turn" if choice.get("finish_reason") == "stop" else choice.get("finish_reason")
            return SimpleNamespace(stop_reason=stop,
                                   content=[SimpleNamespace(type="text", text=choice["message"].get("content") or "")])


def _client():
    """(client, model name) of the first writer available, else (None, reason)."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            import anthropic
            return anthropic.Anthropic(), MODEL
        except ImportError:
            log.warning("anthropic package missing")
    if os.environ.get("GITHUB_TOKEN"):
        return GitHubModels(os.environ["GITHUB_TOKEN"]), None
    return None, "no key"


def write(day: dict, artifacts_dir, client=None, model: str = MODEL) -> dict:
    """Write and check one text per competition. Returns {"date", "model", "groups": [...]}."""
    if client is None:
        client, model = _client()
        if client is None:
            log.info("Neither ANTHROPIC_API_KEY nor GITHUB_TOKEN is set: lecture du jour skipped")
            return {"date": day.get("date"), "groups": [], "skipped": model}
    groups = []
    for name, data in group_inputs(day):
        data_json = json.dumps(data, ensure_ascii=False)
        try:
            r = client.messages.create(model=model, max_tokens=2000, system=SYSTEM,
                                       output_config={"effort": "low"},
                                       messages=[{"role": "user", "content": data_json}])
        except Exception as e:  # noqa: BLE001 - one failed group must not stop the others
            log.warning("lecture %s failed: %s", name, e)
            continue
        if r.stop_reason not in ("end_turn", "stop_sequence"):
            log.warning("lecture %s stopped with %s", name, r.stop_reason)
            continue
        text = "".join(b.text for b in r.content if b.type == "text").strip()
        bad = check(text, data_json)
        if bad or not text:
            log.warning("lecture %s rejected, figures not in the data: %s", name, bad)
            continue
        groups.append({"competition": name, "text": text})
    result = {"date": day["date"], "model": getattr(client, "model", None) or model, "groups": groups}
    folder = Path(artifacts_dir) / FOLDER
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{day['date']}.json").write_text(json.dumps(result, ensure_ascii=False))
    return result


def latest(artifacts_dir, today: date) -> dict | None:
    """The lecture of today, else of the next day that has one."""
    folder = Path(artifacts_dir) / FOLDER
    if not folder.exists():
        return None
    # An empty file (no match of the owner's teams that day) must not hide a later lecture.
    for p in sorted(p for p in folder.glob("*.json") if p.stem >= today.isoformat()):
        data = json.loads(p.read_text())
        if data.get("groups"):
            return data
    return None
