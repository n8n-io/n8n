import { isToolUIPart, type UIMessage } from './ui-messages';

/**
 * Check if the last message is an assistant message with completed tool call approvals.
 * The last step of the message must have at least one tool approval response and
 * all tool approvals must have a response.
 */
export function lastAssistantMessageIsCompleteWithApprovalResponses({
  messages,
}: {
  messages: UIMessage[];
}): boolean {
  const message = messages[messages.length - 1];

  if (!message) {
    return false;
  }

  if (message.role !== 'assistant') {
    return false;
  }

  const lastStepStartIndex = message.parts.reduce((lastIndex, part, index) => {
    return part.type === 'step-start' ? index : lastIndex;
  }, -1);

  const lastStepToolInvocations = message.parts
    .slice(lastStepStartIndex + 1)
    .filter(isToolUIPart)
    .filter(part => !part.providerExecuted);

  return (
    // has at least one tool approval response
    lastStepToolInvocations.filter(part => part.state === 'approval-responded')
      .length > 0 &&
    // all tool approvals must have a response
    lastStepToolInvocations.every(
      part =>
        part.state === 'output-available' ||
        part.state === 'output-error' ||
        part.state === 'approval-responded',
    )
  );
}
