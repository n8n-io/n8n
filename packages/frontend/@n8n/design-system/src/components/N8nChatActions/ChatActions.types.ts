export interface ChatActionsProps {
	/** Show the copy action. Defaults to true. */
	showCopy?: boolean;
	/** Accessible label and tooltip content for the copy action. */
	copyLabel?: string;
	/** Test identifier for the copy action. */
	copyTestId?: string;
	/** Show the read-aloud action. Defaults to true. */
	showReadAloud?: boolean;
	/** Accessible label and tooltip content for the read-aloud action. */
	readAloudLabel?: string;
	/** Show that the message is currently being read aloud. */
	isReadingAloud?: boolean;
	/** Accessible label and tooltip content for stopping read-aloud. */
	stopReadingLabel?: string;
	/** Test identifier for the read-aloud action. */
	readAloudTestId?: string;
}
