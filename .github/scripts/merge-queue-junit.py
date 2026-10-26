"""Read failed test cases from a JUnit artifact without extracting files."""

import io
import json
import sys
import xml.etree.ElementTree as ET
import zipfile


def parse_archive(data):
    failures = []
    errors = []
    reports = 0
    total_size = 0
    source = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for entry in archive.infolist():
            if entry.filename == "merge-queue-reports/source.json":
                if entry.file_size < 10_000:
                    source = json.loads(archive.read(entry))
                continue
            if not entry.filename.endswith("junit.xml"):
                continue
            total_size += entry.file_size
            if entry.file_size > 8_000_000 or total_size > 40_000_000:
                errors.append({"report": entry.filename, "error": "Report size limit exceeded"})
                continue
            try:
                root = ET.fromstring(archive.read(entry))
                reports += 1
                for case in root.iter("testcase"):
                    failure = case.find("failure")
                    if failure is None:
                        failure = case.find("error")
                    if failure is None:
                        continue
                    failures.append({
                        "report": entry.filename,
                        "file": case.get("file") or case.get("classname"),
                        "name": case.get("name"),
                        "message": (failure.get("message") or failure.text or "")[:2000],
                        "source": "junit",
                    })
            except (ET.ParseError, ValueError, zipfile.BadZipFile) as error:
                errors.append({"report": entry.filename, "error": str(error)})
    return {"job_name": source.get("job_name"), "failures": failures, "reports": reports, "errors": errors}


if __name__ == "__main__":
    json.dump(parse_archive(sys.stdin.buffer.read()), sys.stdout)
