"""File sanitization module for removing metadata and sensitive information."""

import io

from PIL import Image


def sanitize_image(file_data: bytes, output_format: str = "JPEG") -> bytes:
    """
    Remove EXIF and all metadata from image files.

    Args:
        file_data: Raw image bytes
        output_format: Output format (JPEG, PNG, etc.)

    Returns:
        Sanitized image bytes without metadata
    """
    with Image.open(io.BytesIO(file_data)) as img:
        # Create a new image without metadata
        sanitized_data = io.BytesIO()

        # Convert to RGB if necessary (for JPEG output)
        if output_format.upper() == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Save without EXIF data
        img.save(sanitized_data, format=output_format, exif=b"")
        sanitized_data.seek(0)
        return sanitized_data.getvalue()


def sanitize_pdf(file_data: bytes) -> bytes:
    """
    Remove metadata from PDF files.

    Args:
        file_data: Raw PDF bytes

    Returns:
        Sanitized PDF bytes without metadata
    """
    import pikepdf

    input_stream = io.BytesIO(file_data)
    output_stream = io.BytesIO()

    with pikepdf.open(input_stream) as pdf:
        # Remove document info metadata
        with pdf.open_metadata() as meta:
            # Clear all XMP metadata
            for key in list(meta.keys()):
                del meta[key]

        # Remove document info dictionary
        if "/Info" in pdf.trailer:
            del pdf.trailer["/Info"]

        # Save sanitized PDF
        pdf.save(output_stream)

    output_stream.seek(0)
    return output_stream.getvalue()


def sanitize_docx(file_data: bytes) -> bytes:
    """
    Remove metadata from DOCX files.

    Args:
        file_data: Raw DOCX bytes

    Returns:
        Sanitized DOCX bytes without metadata
    """
    from docx import Document

    input_stream = io.BytesIO(file_data)
    output_stream = io.BytesIO()

    doc = Document(input_stream)

    # Clear core properties (metadata)
    core_props = doc.core_properties
    core_props.author = ""
    core_props.category = ""
    core_props.comments = ""
    core_props.content_status = ""
    core_props.identifier = ""
    core_props.keywords = ""
    core_props.language = ""
    core_props.last_modified_by = ""
    core_props.subject = ""
    core_props.title = ""
    core_props.version = ""

    # Save sanitized document
    doc.save(output_stream)
    output_stream.seek(0)
    return output_stream.getvalue()


def sanitize_xlsx(file_data: bytes) -> bytes:
    """
    Remove metadata from XLSX files.

    Args:
        file_data: Raw XLSX bytes

    Returns:
        Sanitized XLSX bytes without metadata
    """
    from openpyxl import load_workbook

    input_stream = io.BytesIO(file_data)
    output_stream = io.BytesIO()

    wb = load_workbook(input_stream)

    # Clear workbook properties (metadata)
    props = wb.properties
    props.creator = ""
    props.title = ""
    props.description = ""
    props.subject = ""
    props.identifier = ""
    props.language = ""
    props.created = None
    props.modified = None
    props.lastModifiedBy = ""
    props.category = ""
    props.contentStatus = ""
    props.version = ""
    props.revision = ""
    props.keywords = ""
    props.lastPrinted = None
    props.company = ""
    props.manager = ""

    # Save sanitized workbook
    wb.save(output_stream)
    output_stream.seek(0)
    return output_stream.getvalue()


def sanitize_file(file_data: bytes, filename: str) -> bytes:
    """
    Sanitize a file based on its extension.

    Args:
        file_data: Raw file bytes
        filename: Original filename to determine file type

    Returns:
        Sanitized file bytes

    Raises:
        ValueError: If file type is not supported
    """
    ext = filename.lower().split(".")[-1] if "." in filename else ""

    if ext in ("jpg", "jpeg"):
        return sanitize_image(file_data, "JPEG")
    elif ext == "png":
        return sanitize_image(file_data, "PNG")
    elif ext == "gif":
        return sanitize_image(file_data, "GIF")
    elif ext == "bmp":
        return sanitize_image(file_data, "BMP")
    elif ext == "pdf":
        return sanitize_pdf(file_data)
    elif ext == "docx":
        return sanitize_docx(file_data)
    elif ext == "xlsx":
        return sanitize_xlsx(file_data)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def get_supported_extensions() -> list[str]:
    """Return list of supported file extensions."""
    return ["jpg", "jpeg", "png", "gif", "bmp", "pdf", "docx", "xlsx"]
