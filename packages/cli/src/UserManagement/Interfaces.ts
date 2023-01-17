import { Application } from 'express';
import type { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import type { IExternalHooksClass, IPersonalizationSurveyAnswers } from '@/Interfaces';

export interface JwtToken {
	token: string;
	expiresIn: number;
}

export interface JwtPayload {
	id: string;
	email: string | null;
	password: string | null;
}

export interface PublicUser {
	id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	personalizationAnswers?: IPersonalizationSurveyAnswers | null;
	password?: string;
	passwordResetToken?: string;
	createdAt: Date;
	isPending: boolean;
	inviteAcceptUrl?: string;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
	externalHooks: IExternalHooksClass;
	activeWorkflowRunner: ActiveWorkflowRunner;
}
