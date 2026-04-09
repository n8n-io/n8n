import { base64FromBytes } from "./base64FromBytes.js";

export async function dataUrlFromBlob(blob: Blob, mimeType = "image/jpeg"): Promise<string> {
	const buffer = await blob.arrayBuffer();
	const base64 = base64FromBytes(new Uint8Array(buffer));
	return `data:${mimeType};base64,${base64}`;
}
