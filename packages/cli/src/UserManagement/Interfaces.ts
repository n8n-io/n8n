/* eslint-disable import/no-cycle */
import { Application } from 'express';
import { JwtFromRequestFunction } from 'passport-jwt';
import type { IExternalHooksClass, IPersonalizationSurveyAnswers } from '../Interfaces';

export interface JwtToken {
	token: string;
	expiresIn: number;
}

export interface JwtOptions {
	secretOrKey: string;
	jwtFromRequest: JwtFromRequestFunction;
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
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
	externalHooks: IExternalHooksClass;
	defaultCredentialsName: string;
}
