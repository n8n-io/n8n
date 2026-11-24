"""French names of national teams for text sent to the owner (D85).

The list lives in one place, `api/static/names.js`, which the site also loads. This module
reads it, so the e-mails and the site always use the same names. Data keeps the English
names of the results file; only displayed text is translated.
"""

import re
from functools import lru_cache
from pathlib import Path

NAMES_JS = Path(__file__).parent / "api" / "static" / "names.js"


@lru_cache(maxsize=1)
def table() -> dict[str, str]:
    """English name -> French name, only for names that differ."""
    src = NAMES_JS.read_text(encoding="utf-8")
    body = src[src.index("const FR = {"):src.index("};", src.index("const FR = {"))]
    pairs = re.findall(r'"([^"]+)":\s*"([^"]+)"', body)
    return {en: fr for en, fr in pairs if en != fr}


@lru_cache(maxsize=1)
def _pattern() -> re.Pattern[str]:
    keys = sorted(table(), key=len, reverse=True)  # "Northern Ireland" before "Ireland"
    # Whole names only: no letter or hyphen just before, no letter just after.
    return re.compile(r"(?<![^\W\d_])(?<!-)(" + "|".join(map(re.escape, keys)) + r")(?![^\W\d_])")


def fr_names(text: str) -> str:
    return _pattern().sub(lambda m: table()[m.group(1)], text)
