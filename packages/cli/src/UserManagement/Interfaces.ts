import { Application } from 'express';
import { IDataObject } from 'n8n-workflow';
import { JwtFromRequestFunction } from 'passport-jwt';

export interface JwtToken {
	token: string;
	expiresIn: number;
	validTill: number;
}

export interface JwtPayload {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	password?: string;
	personalizationAnswers?: IDataObject;
}

export interface JwtOptions {
	secretOrKey: string;
	jwtFromRequest: JwtFromRequestFunction;
}

export interface PublicUserData {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	personalizationAnswers: IDataObject;
	password: string;
}

export interface N8nApp {
	app: Application;
	restEndpoint: string;
}
