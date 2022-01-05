/* eslint-disable @typescript-eslint/no-namespace */
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

// ----------------------------------
//         requests to /me
// ----------------------------------

export type RequestWithPayload<T> = express.Request<{}, {}, T>;

export type UserProperty = { user: User };

declare namespace UpdateSelfPayload {
	type Settings = Pick<PublicUserData, 'email' | 'firstName' | 'lastName'>;
	type Password = Pick<PublicUserData, 'password'>;
	type SurveyAnswers = { [key: string]: string } | {};
}

export declare namespace UpdateSelfRequest {
	export type Settings = RequestWithPayload<UpdateSelfPayload.Settings> & UserProperty;
	export type Password = RequestWithPayload<UpdateSelfPayload.Password> & UserProperty;
	export type SurveyAnswers = RequestWithPayload<UpdateSelfPayload.SurveyAnswers> & UserProperty;
}
