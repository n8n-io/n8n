import { Application } from 'express';
import { IDataObject } from 'n8n-workflow';
import { JwtFromRequestFunction } from 'passport-jwt';

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
	personalizationAnswers?: IDataObject | null;
	password?: string;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
}
