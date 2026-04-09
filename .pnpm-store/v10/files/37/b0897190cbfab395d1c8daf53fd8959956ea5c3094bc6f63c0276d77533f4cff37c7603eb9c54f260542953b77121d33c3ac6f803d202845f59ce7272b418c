/**
 * Maps a media type to its corresponding file extension.
 * It was originally introduced to set a filename for audio file uploads
 * in https://github.com/vercel/ai/pull/8159.
 *
 * @param mediaType The media type to map.
 * @returns The corresponding file extension
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types
 */
export function mediaTypeToExtension(mediaType: string) {
  const [_type, subtype = ''] = mediaType.toLowerCase().split('/');

  return (
    {
      mpeg: 'mp3',
      'x-wav': 'wav',
      opus: 'ogg',
      mp4: 'm4a',
      'x-m4a': 'm4a',
    }[subtype] ?? subtype
  );
}
