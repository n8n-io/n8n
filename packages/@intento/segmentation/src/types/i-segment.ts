/**
 * Represents a text segment with position tracking for translation workflows.
 *
 * Used to maintain segment boundaries and ordering during text splitting,
 * translation, and merging operations. Position tracking enables reconstruction
 * of original text structure after processing.
 *
 * @example
 * Input batch: ["Hello world. How are you?", "Good morning."]
 * After splitting with sentence segmentation:
 * [
 *   { text: "Hello world.", textPosition: 0, segmentPosition: 0 },
 *   { text: "How are you?", textPosition: 0, segmentPosition: 1 },
 *   { text: "Good morning.", textPosition: 1, segmentPosition: 0 }
 * ]
 */
export interface ISegment {
	/** Zero-based index of the text item in the input batch */
	readonly textPosition: number;

	/** Zero-based position of this segment within its text item */
	readonly segmentPosition: number;

	/** Text content of the segment */
	readonly text: string;
}
