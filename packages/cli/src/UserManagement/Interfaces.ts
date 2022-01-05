/* eslint-disable import/no-cycle */
import { Application } from 'express';
import express = require('express');
import { JwtFromRequestFunction } from 'passport-jwt';
import { User } from '../databases/entities/User';

export interface JwtToken {
	token: string;
	expiresIn: number;
	validTill: number;
}

export interface JwtOptions {
	secretOrKey: string;
	jwtFromRequest: JwtFromRequestFunction;
}

export interface PublicUserData {
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

export type AuthenticatedRequest<T = {}> = express.Request<{}, {}, T> & { user: User };

// ----------------------------------
//         requests to /me
// ----------------------------------

declare namespace UpdateSelfPayload {
	type Settings = Pick<PublicUserData, 'email' | 'firstName' | 'lastName'>;
	type Password = Pick<PublicUserData, 'password'>;
	type SurveyAnswers = { [key: string]: string } | {};
}

export declare namespace UpdateSelfRequest {
	export type Settings = AuthenticatedRequest<UpdateSelfPayload.Settings>;
	export type Password = AuthenticatedRequest<UpdateSelfPayload.Password>;
	export type SurveyAnswers = AuthenticatedRequest<UpdateSelfPayload.SurveyAnswers>;
}

// ----------------------------------
//      password reset requests
// ----------------------------------

declare namespace PasswordResetPayload {
	type Email = Pick<PublicUserData, 'email'>;
	type Credentials = Pick<PublicUserData, 'password'> & { token: string; userId: string };
}

export declare namespace PasswordResetRequest {
	export type Email = AuthenticatedRequest<PasswordResetPayload.Email>;
	export type Credentials = AuthenticatedRequest<PasswordResetPayload.Credentials>;
}
