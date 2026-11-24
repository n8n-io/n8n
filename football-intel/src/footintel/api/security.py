"""Admin-token check for write endpoints."""

import secrets

from fastapi import Header, HTTPException

from footintel.config import get_settings


def require_admin(authorization: str = Header(default=""),
                  x_admin_token: str = Header(default="")) -> None:
    """Accept the token in X-Admin-Token (dashboard) or as a Bearer token (scripts).

    The dashboard uses its own header because a reverse proxy with a password
    (deploy/Caddyfile) already takes the Authorization header."""
    expected = get_settings().admin_token
    if expected is None or not expected.get_secret_value():
        raise HTTPException(503, "ADMIN_TOKEN is not configured: write endpoints are disabled")
    given = x_admin_token.strip() or (
        authorization[7:].strip() if authorization.startswith("Bearer ") else "")
    if not given or not secrets.compare_digest(given, expected.get_secret_value()):
        raise HTTPException(401, "invalid token")
