import { convertBase64ToUint8Array } from '@ai-sdk/provider-utils';

export const imageMediaTypeSignatures = [
  {
    mediaType: 'image/gif' as const,
    bytesPrefix: [0x47, 0x49, 0x46], // GIF
  },
  {
    mediaType: 'image/png' as const,
    bytesPrefix: [0x89, 0x50, 0x4e, 0x47], // PNG
  },
  {
    mediaType: 'image/jpeg' as const,
    bytesPrefix: [0xff, 0xd8], // JPEG
  },
  {
    mediaType: 'image/webp' as const,
    bytesPrefix: [
      0x52,
      0x49,
      0x46,
      0x46, // "RIFF"
      null,
      null,
      null,
      null, // file size (variable)
      0x57,
      0x45,
      0x42,
      0x50, // "WEBP"
    ],
  },
  {
    mediaType: 'image/bmp' as const,
    bytesPrefix: [0x42, 0x4d],
  },
  {
    mediaType: 'image/tiff' as const,
    bytesPrefix: [0x49, 0x49, 0x2a, 0x00],
  },
  {
    mediaType: 'image/tiff' as const,
    bytesPrefix: [0x4d, 0x4d, 0x00, 0x2a],
  },
  {
    mediaType: 'image/avif' as const,
    bytesPrefix: [
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
    ],
  },
  {
    mediaType: 'image/heic' as const,
    bytesPrefix: [
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ],
  },
] as const;

export const audioMediaTypeSignatures = [
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xfb],
  },
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xfa],
  },
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xf3],
  },
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xf2],
  },
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xe3],
  },
  {
    mediaType: 'audio/mpeg' as const,
    bytesPrefix: [0xff, 0xe2],
  },
  {
    mediaType: 'audio/wav' as const,
    bytesPrefix: [
      0x52, // R
      0x49, // I
      0x46, // F
      0x46, // F
      null,
      null,
      null,
      null,
      0x57, // W
      0x41, // A
      0x56, // V
      0x45, // E
    ],
  },
  {
    mediaType: 'audio/ogg' as const,
    bytesPrefix: [0x4f, 0x67, 0x67, 0x53],
  },
  {
    mediaType: 'audio/flac' as const,
    bytesPrefix: [0x66, 0x4c, 0x61, 0x43],
  },
  {
    mediaType: 'audio/aac' as const,
    bytesPrefix: [0x40, 0x15, 0x00, 0x00],
  },
  {
    mediaType: 'audio/mp4' as const,
    bytesPrefix: [0x66, 0x74, 0x79, 0x70],
  },
  {
    mediaType: 'audio/webm',
    bytesPrefix: [0x1a, 0x45, 0xdf, 0xa3],
  },
] as const;

export const videoMediaTypeSignatures = [
  {
    mediaType: 'video/mp4' as const,
    bytesPrefix: [
      0x00,
      0x00,
      0x00,
      null,
      0x66,
      0x74,
      0x79,
      0x70, // ftyp
    ],
  },
  {
    mediaType: 'video/webm' as const,
    bytesPrefix: [0x1a, 0x45, 0xdf, 0xa3], // EBML
  },
  {
    mediaType: 'video/quicktime' as const,
    bytesPrefix: [
      0x00,
      0x00,
      0x00,
      0x14,
      0x66,
      0x74,
      0x79,
      0x70,
      0x71,
      0x74, // ftypqt
    ],
  },
  {
    mediaType: 'video/x-msvideo' as const,
    bytesPrefix: [0x52, 0x49, 0x46, 0x46], // RIFF (AVI)
  },
] as const;

const stripID3 = (data: Uint8Array | string) => {
  const bytes =
    typeof data === 'string' ? convertBase64ToUint8Array(data) : data;
  const id3Size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  // The raw MP3 starts here
  return bytes.slice(id3Size + 10);
};

function stripID3TagsIfPresent(data: Uint8Array | string): Uint8Array | string {
  const hasId3 =
    (typeof data === 'string' && data.startsWith('SUQz')) ||
    (typeof data !== 'string' &&
      data.length > 10 &&
      data[0] === 0x49 && // 'I'
      data[1] === 0x44 && // 'D'
      data[2] === 0x33); // '3'

  return hasId3 ? stripID3(data) : data;
}

/**
 * Detect the media IANA media type of a file using a list of signatures.
 *
 * @param data - The file data.
 * @param signatures - The signatures to use for detection.
 * @returns The media type of the file.
 */
export function detectMediaType({
  data,
  signatures,
}: {
  data: Uint8Array | string;
  signatures:
    | typeof audioMediaTypeSignatures
    | typeof imageMediaTypeSignatures
    | typeof videoMediaTypeSignatures;
}): (typeof signatures)[number]['mediaType'] | undefined {
  const processedData = stripID3TagsIfPresent(data);

  // Convert the first ~18 bytes (24 base64 chars) for consistent detection logic:
  const bytes =
    typeof processedData === 'string'
      ? convertBase64ToUint8Array(
          processedData.substring(0, Math.min(processedData.length, 24)),
        )
      : processedData;

  for (const signature of signatures) {
    if (
      bytes.length >= signature.bytesPrefix.length &&
      signature.bytesPrefix.every(
        (byte, index) => byte === null || bytes[index] === byte,
      )
    ) {
      return signature.mediaType;
    }
  }

  return undefined;
}
