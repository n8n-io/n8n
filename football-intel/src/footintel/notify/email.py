"""Weekly report by e-mail, as a PDF. Disabled, with a log line, when SMTP is not configured.

The PDF is printed from the report's HTML by a headless Chrome or Chromium (preinstalled on
GitHub-hosted runners). Any SMTP account works: with Gmail, use an app password, never the
account password.
"""

import logging
import os
import shutil
import smtplib
import subprocess
from email.message import EmailMessage
from pathlib import Path

from footintel.config import Settings

log = logging.getLogger(__name__)

BROWSERS = ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")


def _browser() -> str | None:
    if os.environ.get("CHROME_BIN"):
        return os.environ["CHROME_BIN"]
    return next((b for b in map(shutil.which, BROWSERS) if b), None)


def html_to_pdf(html: Path, pdf: Path) -> Path | None:
    browser = _browser()
    if not browser:
        log.warning("No Chrome or Chromium found: PDF skipped")
        return None
    subprocess.run([browser, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf}", html.resolve().as_uri()],
                   check=True, capture_output=True, timeout=120)
    return pdf if pdf.exists() else None


def configured(settings: Settings) -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password
                and settings.smtp_password.get_secret_value() and settings.report_to)


def send_report(settings: Settings, subject: str, body: str, attachments: list[Path]) -> bool:
    if not configured(settings):
        log.info("SMTP not configured: e-mail skipped")
        return False
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subject, settings.smtp_user, settings.report_to
    msg.set_content(body)
    for path in attachments:
        subtype = "pdf" if path.suffix == ".pdf" else "octet-stream"
        msg.add_attachment(path.read_bytes(), maintype="application", subtype=subtype, filename=path.name)
    password = settings.smtp_password.get_secret_value().strip()
    if settings.smtp_host == "smtp.gmail.com":
        password = "".join(password.split())  # Google shows app passwords in groups of four
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=60) as smtp:
            smtp.starttls()
            smtp.login(settings.smtp_user, password)
            smtp.send_message(msg)
    except smtplib.SMTPServerDisconnected:
        # Some servers drop STARTTLS sessions from cloud runners; implicit TLS is the other standard port.
        log.warning("SMTP connection closed on port %s: retrying with SSL on 465", settings.smtp_port)
        with smtplib.SMTP_SSL(settings.smtp_host, 465, timeout=60) as smtp:
            smtp.login(settings.smtp_user, password)
            smtp.send_message(msg)
    log.info("Report e-mailed to %d recipient(s)", len(settings.report_to.split(",")))
    return True


def email_weekly(settings: Settings, paths: dict, body: str, subject: str = "Football Intel — rapport hebdomadaire") -> bool:
    """`body`: the week in plain words (reports/plain_week.py); the technical report is attached."""
    pdf = html_to_pdf(paths["html"], paths["html"].with_suffix(".pdf"))
    return send_report(settings, subject, body, [pdf] if pdf else [paths["html"]])
