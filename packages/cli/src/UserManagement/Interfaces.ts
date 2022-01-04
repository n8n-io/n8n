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

export type UserRequest = express.Request & { user: User };

export type UpdateUserSettingsRequest = RequestWithCustomBody<
	Pick<PublicUserData, 'email' | 'firstName' | 'lastName'>
> & {
	user: User;
};

export type UpdateUserPasswordRequest = RequestWithCustomBody<Pick<PublicUserData, 'password'>> & {
	user: User;
};

export type PersonalizationAnswersRequest = RequestWithCustomBody<
	| {
			[key: string]: string;
	  }
	| {}
> & {
	user: User;
};

export type RequestWithCustomBody<T> = express.Request<{}, {}, T>;
