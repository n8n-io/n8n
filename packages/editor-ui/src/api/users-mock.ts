import { IPersonalizationSurveyAnswers, IRestApiContext, IUserResponse } from '@/Interface';
import { IDataObject } from 'n8n-workflow';

const users = [
	{
		id: '0',
		globalRole: {
			name: 'owner',
			id: "1",
		},
	},
	{
		id: '10',
		firstName: 'xi',
		lastName: 'lll',
		email: 'test9@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '2',
		email: 'test2@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '3',
		firstName: 'sup',
		lastName: 'yo',
		email: 'test3@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '4',
		firstName: 'xx',
		lastName: 'aaaa',
		email: 'test4@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '5',
		firstName: 'gg',
		lastName: 'kk',
		email: 'test5@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '7',
		email: 'test7@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '8',
		firstName: 'sup',
		lastName: 'yo',
		email: 'test8@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: '9',
		firstName: 'aaa',
		lastName: 'yo',
		email: 'test88@gmail.com',
		globalRole: {
			name: 'member',
			id: "2",
		},
	},
	{
		id: "10",
		firstName: 'verylongfirstnameofmymomandmydad',
		lastName: 'verylonglastnameofmymomandmydads',
		email: 'veryyyyyyyyyyyyyyyyylongemailllllllllllllllllllll@gmail.com',
		globalRole: {
			name: "member",
			id: "2",
		},
	},
];

if (!window.localStorage.getItem('mock.users.currentUserId')) {
	window.localStorage.setItem('mock.users.currentUserId', '0');
}

const getRandomId = () =>  `${Math.floor(Math.random() * 10000000000 + 100)}`;

if (!window.localStorage.getItem('mock.users.users')) {
	window.localStorage.setItem('mock.users.users', JSON.stringify(users));
}

if (!window.localStorage.getItem('mock.users.currentUserId')) {
	window.localStorage.setItem('mock.users.currentUserId', 'null');
}

function getAllUsers() {
	return JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');
}

function getCurrUser() {
	const id = window.localStorage.getItem('mock.users.currentUserId');
	if (!id) {
		return null;
	}

	const users = JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');

	return users.find((user: IUserResponse) => user.id === id);
}

function addUser(user: IUserResponse) {
	const users = JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');
	users.push(user);
	window.localStorage.setItem('mock.users.users', JSON.stringify(users));
}

function removeUser(userId: string) {
	let users = JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');
	users = users.filter((user: IUserResponse) => user.id !== userId);
	window.localStorage.setItem('mock.users.users', JSON.stringify(users));
}

function log(context: IRestApiContext, method: string, path: string, params?: any): void { // tslint:disable-line:no-any
	console.log(method, path, params); // eslint-disable-line no-console
}

export async function loginCurrentUser(context: IRestApiContext): Promise<IUserResponse | null> {
	log(context, 'GET', '/login');

	return await Promise.resolve(getCurrUser());
}

export async function getCurrentUser(context: IRestApiContext): Promise<IUserResponse | null> {
	log(context, 'GET', '/me');

	return await Promise.resolve(getCurrUser());
}

export async function login(context: IRestApiContext, params: {email: string, password: string}): Promise<IUserResponse> {
	log(context, 'POST', '/login', params);

	const users = getAllUsers();
	const user = users.find((user: IUserResponse) => user.email === params.email && user.firstName);
	if (!user) {
		throw new Error(`Cannot login with this email. Must use an existing email`);
	}
	window.localStorage.setItem('mock.users.currentUserId', user.id);
	return await Promise.resolve(user);
}

export async function logout(context: IRestApiContext): Promise<void> {
	log(context, 'POST', '/logout');
	// @ts-ignore
	window.localStorage.setItem('mock.users.currentUserId', undefined);
}

export async function setupOwner(context: IRestApiContext, params: { firstName: string; lastName: string; email: string; password: string;}): Promise<IUserResponse> {
	log(context, 'POST', '/owner/setup', params as unknown as IDataObject);
	const user = getCurrUser();
	removeUser('0');
	const newUser: IUserResponse = {...user, ...params};
	addUser(newUser);

	return await Promise.resolve(newUser);
}

export async function validateSignupToken(context: IRestApiContext, params: {inviteeId: string, inviterId: string}): Promise<{inviter: {firstName: string, lastName: string}}> {
	if (params.inviterId !== '123' || params.inviteeId !== '345') {
		throw new Error('invalid token. try query ?inviterId=123&inviteeId=345');
	}

	log(context, 'GET', '/resolve-signup-token', params);

	return await Promise.resolve({
		inviter: {
			firstName: 'Moh',
			lastName: 'Salah',
		},
	});
}

export async function signup(context: IRestApiContext, params: {inviterId: string; inviteeId: string;  firstName: string; lastName: string; password: string}): Promise<IUserResponse> {
	if (params.inviterId !== '123' || params.inviteeId !== '345') {
		throw new Error('invalid token. try query ?inviterId=123&inviteeId=345');
	}

	log(context, 'POST', `/users/${params.inviteeId}`, params as unknown as IDataObject);

	const newUser: IUserResponse = {...params, email: `${params.firstName}@n8n.io`, id: getRandomId(), "globalRole": {name: 'member', id: '2'}};
	window.localStorage.setItem('mock.users.currentUserId', newUser.id);
	addUser(newUser);

	return await Promise.resolve(newUser);
}

export async function sendForgotPasswordEmail(context: IRestApiContext, params: {email: string}): Promise<void> {
	log(context, 'POST', '/forgot-password', params);
}

export async function validatePasswordToken(context: IRestApiContext, params: {token: string, userId: string}): Promise<void> {
	log(context, 'GET', '/resolve-password-token', params);

	if (params.token !== '123' && params.userId !== '345') {
		throw new Error('invalid token. try query ?token=123&userId=345');
	}
}

export async function changePassword(context: IRestApiContext, params: {token: string, password: string, userId: string}): Promise<void> {
	if (params.token !== '123' && params.userId !== '345') {
		throw new Error('invalid token. try query ?token=123&userId=345');
	}

	log(context, 'POST', '/change-password', params);
}

export async function updateCurrentUser(context: IRestApiContext, params: {id: string, firstName: string, lastName: string, email: string}): Promise<IUserResponse> {
	log(context, 'PATCH', `/me`, params as unknown as IDataObject);
	const user = getCurrUser();
	removeUser(params.id);
	const newUser = {
		...user,
		...params,
	};
	addUser(newUser);

	return await Promise.resolve(newUser);
}

export async function updateCurrentUserPassword(context: IRestApiContext, params: {password: string}): Promise<void> {
	log(context, 'PATCH', `/me/password`, {password: params.password});
}

export async function deleteUser(context: IRestApiContext, {id, transferId}: {id: string, transferId?: string}): Promise<void> {
	log(context, 'DELETE', `/users/${id}`, transferId ? { transferId } : {});
	removeUser(id);
}

export async function getUsers(context: IRestApiContext): Promise<IUserResponse[]> {
	log(context, 'GET', '/users');

	return Promise.resolve(getAllUsers());
}

export async function inviteUsers(context: IRestApiContext, params: Array<{email: string}>): Promise<Array<Partial<IUserResponse>>> {
	log(context, 'POST', '/users', params);

	const users = params.map(({email}: {email: string}) => ({
		id: getRandomId(),
		email,
	}));
	users.forEach((user) => addUser({
		...user,
		globalRole: {
			name: 'member',
			id: '2',
		},
	}));

	return await Promise.resolve(users);
}

export async function reinvite(context: IRestApiContext, {id}: {id: string}): Promise<void> {
	log(context, 'POST', `/users/${id}/reinvite`);
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationSurveyAnswers): Promise<void> {
	log(context, 'POST', `/me/survey`, params);
	const user = getCurrUser();
	removeUser(user.id);
	const newUser = {
		...user,
		personalizationAnswers: params,
	};
	addUser(newUser);
	return Promise.resolve();
}
