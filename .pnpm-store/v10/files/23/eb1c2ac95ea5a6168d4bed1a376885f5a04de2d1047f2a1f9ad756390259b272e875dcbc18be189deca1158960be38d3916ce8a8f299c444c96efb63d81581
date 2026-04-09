/**
 * Strips file extension segments from a filename.
 *
 * Examples:
 * - "report.pdf" -> "report"
 * - "archive.tar.gz" -> "archive"
 * - "filename" -> "filename"
 */
export function stripFileExtension(filename: string): string {
  const firstDotIndex = filename.indexOf('.');

  return firstDotIndex === -1 ? filename : filename.slice(0, firstDotIndex);
}
