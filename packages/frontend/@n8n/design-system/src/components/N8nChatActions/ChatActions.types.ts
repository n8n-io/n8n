type CopyActionProps =
	| {
			/** Show the copy action. Defaults to true. */
			showCopy?: true;
			/** Accessible label and tooltip content for the copy action. Overrides default */
			copyLabel?: string;
			/** Copy the message. */
			onCopy: () => void;
	  }
	| {
			/** Hide the copy action. */
			showCopy: false;
			copyLabel?: never;
			onCopy?: never;
	  };

type ReadAloudActionProps =
	| {
			/** Show the read-aloud action. Defaults to true. */
			showReadAloud?: true;
			/** Accessible label and tooltip content for the read-aloud action. */
			readAloudLabel: string;
			/** Read the message aloud. */
			onReadAloud: () => void;
	  }
	| {
			/** Hide the read-aloud action. */
			showReadAloud: false;
			readAloudLabel?: never;
			onReadAloud?: never;
	  };

export type ChatActionsProps = CopyActionProps & ReadAloudActionProps;
