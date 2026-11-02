/** Display data for one file or image. Feature components prepare URLs. */
export interface AttachmentProps {
	/** File name for the label and image alternative text. */
	fileName: string;
	/** MIME type used to select the file or image display. */
	mimeType: string;
	/** Optional file size in bytes. */
	sizeBytes?: number;
	/** Image preview URL. */
	src?: string;
	/** Whether the attachment has a remove control. Default true. */
	isRemovable?: boolean;
	/** Whether the attachment can open in a preview dialog. Default true. */
	isPreviewable?: boolean;
}

/** Events for one attachment. The parent retains the original file. */
export interface AttachmentEmits {
	/** Request removal of this attachment. */
	remove: [];
	/** Report a loaded image preview. */
	load: [];
	/** Report a failed image preview. */
	error: [];
}
