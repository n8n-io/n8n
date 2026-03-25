import path from "path";

export default function convertPathToPosix(filePath: string) {
  const isExtendedLengthPath = filePath.startsWith("\\\\?\\");

  if (isExtendedLengthPath) {
    return filePath;
  }

  return filePath.split(path?.win32?.sep).join(path?.posix?.sep ?? "/");
}
