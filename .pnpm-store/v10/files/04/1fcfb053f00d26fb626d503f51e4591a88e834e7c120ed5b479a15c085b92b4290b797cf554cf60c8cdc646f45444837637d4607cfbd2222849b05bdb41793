import { StepResult } from './step-result';
import { ToolSet } from './tool-set';

export type StopCondition<TOOLS extends ToolSet> = (options: {
  steps: Array<StepResult<TOOLS>>;
}) => PromiseLike<boolean> | boolean;

export function stepCountIs(stepCount: number): StopCondition<any> {
  return ({ steps }) => steps.length === stepCount;
}

export function hasToolCall(toolName: string): StopCondition<any> {
  return ({ steps }) =>
    steps[steps.length - 1]?.toolCalls?.some(
      toolCall => toolCall.toolName === toolName,
    ) ?? false;
}

export async function isStopConditionMet<TOOLS extends ToolSet>({
  stopConditions,
  steps,
}: {
  stopConditions: Array<StopCondition<TOOLS>>;
  steps: Array<StepResult<TOOLS>>;
}): Promise<boolean> {
  return (
    await Promise.all(stopConditions.map(condition => condition({ steps })))
  ).some(result => result);
}
