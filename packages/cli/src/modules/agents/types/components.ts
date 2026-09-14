/** Inline components — rendered directly in the chat message */
export type InlineComponent =
	| {
			type: 'button';
			label: string;
			value: string;
			style?: 'primary' | 'danger';
			confirm?: { title: string; text: string; confirm: string; deny: string };
	  }
	| { type: 'select'; label: string; options: Array<{ label: string; value: string }> }
	| {
			type: 'section';
			text: string;
			/** Optional button displayed inline with this section (renders as an accessory) */
			button?: { label: string; value: string; style?: 'primary' | 'danger' };
			/** Optional image displayed inline with this section (renders as an accessory) */
			image?: { url: string; alt: string };
	  }
	| { type: 'divider' }
	| { type: 'image'; url: string; alt: string }
	| {
			type: 'context';
			/** Array of text and image elements displayed in a smaller, muted row */
			elements: Array<{ type: 'text'; text: string } | { type: 'image'; url: string; alt: string }>;
	  };

/** Form components — rendered in a modal/dialog */
export type FormComponent =
	| {
			type: 'text-input';
			id: string;
			label: string;
			placeholder?: string;
			multiline?: boolean;
	  }
	| {
			type: 'select-input';
			id: string;
			label: string;
			options: Array<{ label: string; value: string }>;
	  };

export type SuspendComponent = InlineComponent | FormComponent;

/**
 * Rich suspend payload for HITL tool interactions.
 * Platform integrations (Slack, Discord, etc.) translate these
 * abstract components into platform-specific UI.
 */
export interface RichSuspendPayload {
	/** Header text displayed above components */
	message?: string;
	/** UI components to render */
	components: SuspendComponent[];
	/** Modal title when form components are present */
	formTitle?: string;
}

/**
 * Normalized resume data from any platform interaction.
 * All platforms normalize their responses into this shape
 * before calling agent.resume().
 */
export interface ComponentResumeData {
	values: Record<string, string>;
}
