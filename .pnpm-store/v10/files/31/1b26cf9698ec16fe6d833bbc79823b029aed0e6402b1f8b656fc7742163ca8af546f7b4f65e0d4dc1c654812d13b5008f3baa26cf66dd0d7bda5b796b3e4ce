export function isSupportedFileUrl(url: URL): boolean {
  const urlString = url.toString();

  // Google Generative Language files API
  if (
    urlString.startsWith(
      'https://generativelanguage.googleapis.com/v1beta/files/',
    )
  ) {
    return true;
  }

  // YouTube URLs (public or unlisted videos)
  const youtubeRegexes = [
    /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+(?:&[\w=&.-]*)?$/,
    /^https:\/\/youtu\.be\/[\w-]+(?:\?[\w=&.-]*)?$/,
  ];

  return youtubeRegexes.some(regex => regex.test(urlString));
}
