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

export type RequestWithPayload<T> = express.Request<{}, {}, T>;

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
