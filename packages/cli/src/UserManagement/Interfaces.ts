/* eslint-disable import/no-cycle */
import { Application } from 'express';
import { JwtFromRequestFunction } from 'passport-jwt';
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
	personalizationAnswers?: { [key: string]: string } | null;
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

export declare namespace UpdateSelfRequest {
	export type Settings = AuthenticatedRequest<
		{},
		{},
		Pick<PublicUser, 'email' | 'firstName' | 'lastName'>
	>;
	export type Password = AuthenticatedRequest<{}, {}, Pick<PublicUser, 'password'>>;
	export type SurveyAnswers = AuthenticatedRequest<{}, {}, Record<string, string> | {}>;
}

// ----------------------------------
//      password reset requests
// ----------------------------------

export declare namespace PasswordResetRequest {
	export type Email = AuthenticatedRequest<{}, {}, Pick<PublicUser, 'email'>>;

	export type Credentials = AuthenticatedRequest<{}, {}, {}, { userId?: string; token?: string }>;

	export type NewPassword = AuthenticatedRequest<
		{},
		{},
		Pick<PublicUser, 'password'> & { token?: string; id?: string }
	>;
}

// ----------------------------------
//        requests to /users
// ----------------------------------

export declare namespace UserRequest {
	export type Invite = AuthenticatedRequest<{}, {}, Array<{ email: string }>>;

	export type SignUp = AuthenticatedRequest<
		{ id: string },
		{ inviterId?: string; inviteeId?: string }
	>;

	export type Delete = AuthenticatedRequest<{ id: string }, {}, {}, { transferId?: string }>;

	export type Reinvite = AuthenticatedRequest<{ id: string }>;
}
