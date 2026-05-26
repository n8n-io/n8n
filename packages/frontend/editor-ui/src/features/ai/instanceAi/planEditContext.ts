import type { InjectionKey, Ref } from 'vue';

export interface PlanEditContext {
	requestId: string;
	inputThreadId?: string;
	taskCount: number;
}

export interface PlanEditController {
	activePlanEdit: Ref<PlanEditContext | null>;
	updatingPlanRequestIds: ReadonlySet<string>;
	startPlanEdit: (context: PlanEditContext) => void;
	cancelPlanEdit: () => void;
	markPlanUpdatePending: (requestId: string) => void;
	clearPlanUpdatePending: (requestId: string) => void;
}

export const PlanEditControllerKey: InjectionKey<PlanEditController> = Symbol(
	'instanceAiPlanEditController',
);
