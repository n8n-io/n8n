export function splitDataUrl(dataUrl: string): {
  mediaType: string | undefined;
  base64Content: string | undefined;
} {
  try {
    const [header, base64Content] = dataUrl.split(',');
    return {
      mediaType: header.split(';')[0].split(':')[1],
      base64Content,
    };
  } catch (error) {
    return {
      mediaType: undefined,
      base64Content: undefined,
    };
  }
}
