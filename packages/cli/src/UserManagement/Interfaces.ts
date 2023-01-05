import type { Application } from 'express';
import type { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import type { IExternalHooksClass, IPersonalizationSurveyAnswers } from '@/Interfaces';
import type { AuthProviderType } from '@/databases/entities/AuthIdentity';
import type { Role } from '@/databases/entities/Role';

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
	globalRole?: Role;
	signInType: AuthProviderType;
	disabled: boolean;
	inviteAcceptUrl?: string;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
	externalHooks: IExternalHooksClass;
	activeWorkflowRunner: ActiveWorkflowRunner;
}
