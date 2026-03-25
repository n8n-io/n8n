import type { FeedbackFormData, FeedbackInternalOptions, FeedbackScreenshotIntegration, SendFeedback } from '@sentry/core';
import type { VNode } from 'preact';
export interface Props extends Pick<FeedbackInternalOptions, 'showEmail' | 'showName'> {
    options: FeedbackInternalOptions;
    defaultEmail: string;
    defaultName: string;
    onFormClose: () => void;
    onSubmit: SendFeedback;
    onSubmitSuccess: (data: FeedbackFormData, eventId: string) => void;
    onSubmitError: (error: Error) => void;
    screenshotInput: ReturnType<FeedbackScreenshotIntegration['createInput']> | undefined;
}
export declare function Form({ options, defaultEmail, defaultName, onFormClose, onSubmit, onSubmitSuccess, onSubmitError, showEmail, showName, screenshotInput, }: Props): VNode;
//# sourceMappingURL=Form.d.ts.map