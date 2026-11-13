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
	/** Optional file URL to open in a new tab. */
	href?: string;
	/** File name for a native download link instead of a new-tab link. */
	download?: string;
}

/** Events for one attachment. The parent retains the original file. */
export interface AttachmentEmits {
	/** Report that removal has started. */
	'remove-start': [];
	/** Report that removal has finished or the removing component has unmounted. */
	'remove-end': [];
	/** Request removal of this attachment. */
	remove: [];
	/** Report a loaded image preview. */
	load: [];
	/** Report a failed image preview. */
	error: [];
}
