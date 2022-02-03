/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Application } from 'express';
import { JwtFromRequestFunction } from 'passport-jwt';
import { IPersonalizationSurveyAnswers } from '../Interfaces';
import type { AuthenticatedRequest } from '../requests';

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
}

// ----------------------------------
//         requests to /me
// ----------------------------------

// TODO: Remove?

export declare namespace UpdateSelfRequest {
	export type Settings = AuthenticatedRequest<
		{},
		{},
		Pick<PublicUser, 'email' | 'firstName' | 'lastName'>
	>;
	export type Password = AuthenticatedRequest<{}, {}, Pick<PublicUser, 'password'>>;
	export type SurveyAnswers = AuthenticatedRequest<{}, {}, Record<string, string> | {}>;
}
