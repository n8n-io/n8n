import type { BrowserRecordingScreenshot } from '../schemas/browser-recording.schema';
import type { InstanceAiCredits, ToolCategory } from '../schemas/instance-ai.schema';

export type InstanceAiPushMessage =
	| {
			type: 'instanceAiGatewayStateChanged';
			data: {
				connected: boolean;
				directory: string | null;
				hostIdentifier: string | null;
				toolCategories: ToolCategory[];
			};
	  }
	| {
			type: 'instanceAiBrowserStateChanged';
			data: {
				connected: boolean;
				connectedAt: string | null;
				toolCategories: ToolCategory[];
			};
	  }
	| {
			type: 'updateInstanceAiCredits';
			data: InstanceAiCredits & {
				// Present only on a per-message claim that carries the acting thread's
				// running total (decimal). Grouped so the thread id and its total always
				// travel together — never one without the other.
				creditsPerThread?: {
					threadId: string;
					totalCreditsUsed: number;
				};
			};
	  }
	| {
			type: 'instanceAiMcpToolCallFailed';
			data: {
				connectionId: string;
			};
	  }
	| {
			type: 'instanceAiRecordingStateChanged';
			data: {
				/** The thread that asked for this recording — the frontend only reacts when
				 *  this matches the thread it's currently viewing. */
				threadId: string;
				/** 'recording' is the only live state; 'stopped' and 'discarded' are terminal —
				 *  the frontend removes the live artifact on either. */
				status: 'recording' | 'stopped' | 'discarded';
				actionCount: number;
				/** Latest running summary of what's been seen so far, once one has been
				 *  generated. Absent until the first caption tick completes. */
				caption?: string;
			};
	  }
	| {
			type: 'instanceAiRecordingScreenshotReceived';
			data: {
				/** The thread that asked for this recording — same matching rule as
				 *  `instanceAiRecordingStateChanged`. */
				threadId: string;
				actionId: BrowserRecordingScreenshot['actionId'];
				mimeType: BrowserRecordingScreenshot['mimeType'];
				data: BrowserRecordingScreenshot['data'];
			};
	  };
