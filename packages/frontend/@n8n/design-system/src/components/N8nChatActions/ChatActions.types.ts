export type ChatActionCopyStatus = 'success' | 'error';
export type ChatActionReadAloudStatus = 'started' | 'stopped' | 'ended';

export interface ChatActionCopyResult {
	text: string;
	status: ChatActionCopyStatus;
}

export interface ChatActionReadAloudResult {
	text: string;
	status: ChatActionReadAloudStatus;
}

export interface ChatActionsProps {
	/** Message content used by the copy and read-aloud actions. */
	content: string;
	/** Show the copy action. Defaults to true. */
	showCopy?: boolean;
	/** Accessible label and tooltip content for the copy action. */
	copyLabel?: string;
	/** Test identifier for the copy action. */
	copyTestId?: string;
	/** Called after a copy attempt. */
	onCopy?: (result: ChatActionCopyResult) => void;
	/** Show the read-aloud action when speech synthesis is available. Defaults to true. */
	showReadAloud?: boolean;
	/** Accessible label and tooltip content for the read-aloud action. */
	readAloudLabel?: string;
	/** Accessible label and tooltip content for stopping read-aloud. */
	stopReadingLabel?: string;
	/** Test identifier for the read-aloud action. */
	readAloudTestId?: string;
	/** Called when reading starts, stops, or ends. */
	onReadAloud?: (result: ChatActionReadAloudResult) => void;
}
