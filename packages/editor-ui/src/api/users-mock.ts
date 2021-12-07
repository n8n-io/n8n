import { IRestApiContext, IUser } from '@/Interface';
import { IDataObject } from 'n8n-workflow';

const users = [
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

	return users.find((user: IUser) => user.id === id);
}

function addUser(user: IUser) {
	const users = JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');
	users.push(user);
	window.localStorage.setItem('mock.users.users', JSON.stringify(users));
}

function removeUser(userId: string) {
	let users = JSON.parse(window.localStorage.getItem('mock.users.users') || '[]');
	users = users.filter((user: IUser) => user.id !== userId);
	window.localStorage.setItem('mock.users.users', JSON.stringify(users));
}

function log(context: IRestApiContext, method: string, path: string, params?: any): void { // tslint:disable-line:no-any
	console.log(method, path, params); // eslint-disable-line no-console
}

export async function getCurrentUser(context: IRestApiContext): Promise<IUser | null> {
	log(context, 'GET', '/user');

	return await Promise.resolve(getCurrUser());
}

export async function login(context: IRestApiContext, params: {email: string, password: string}): Promise<IUser> {
	log(context, 'POST', '/login', params);

	const users = getAllUsers();
	const user = users.find((user: IUser) => user.email === params.email && user.firstName);
	if (!user) {
		throw new Error(`Cannot login with this email. Must use an existing email`);
	}
	window.localStorage.setItem('mock.users.currentUserId', user.id);
	return await Promise.resolve(user);
}

export async function logout(context: IRestApiContext): Promise<void> {
	log(context, 'POST', '/logout');
	window.localStorage.removeItem('mock.users.currentUserId');
}

export async function setupOwner(context: IRestApiContext, params: { firstName: string; lastName: string; email: string; password: string;}): Promise<IUser> {
	log(context, 'POST', '/owner-setup', params as unknown as IDataObject);
	window.localStorage.setItem('mock.settings.isInstanceSetup', 'true');
	const newUser: IUser = {...params, id: getRandomId(), "globalRole": {name: 'owner', id: '1'}};
	window.localStorage.setItem('mock.users.currentUserId', newUser.id);
	addUser(newUser);

	return await Promise.resolve(newUser);
}

export async function validateSignupToken(context: IRestApiContext, params: {token: string}): Promise<{inviter: {firstName: string, lastName: string}}> {
	if (params.token !== '1234') {
		throw new Error('invalid token. try query ?token=1234');
	}

	log(context, 'GET', '/resolve-signup-token', params);

	return await Promise.resolve({
		inviter: {
			firstName: 'Moh',
			lastName: 'Salah',
		},
	});
}

export async function signup(context: IRestApiContext, params: {token: string; firstName: string; lastName: string; password: string}): Promise<IUser> {
	if (params.token !== '1234') {
		throw new Error('invalid token. try query ?token=1234');
	}

	log(context, 'POST', '/user', params as unknown as IDataObject);

	window.localStorage.setItem('mock.settings.isInstanceSetup', 'true');
	const newUser: IUser = {...params, email: `${params.firstName}@n8n.io`, id: getRandomId(), "globalRole": {name: 'member', id: '2'}};
	window.localStorage.setItem('mock.users.currentUserId', newUser.id);
	addUser(newUser);

	return await Promise.resolve(newUser);
}

export async function sendForgotPasswordEmail(context: IRestApiContext, params: {email: string}): Promise<void> {
	log(context, 'POST', '/forgot-password', params);
}

export async function validatePasswordToken(context: IRestApiContext, params: {token: string}): Promise<void> {
	log(context, 'GET', '/resolve-password-token', params);

	if (params.token !== '1234') {
		throw new Error('invalid token. try query ?token=1234');
	}
}

export async function changePassword(context: IRestApiContext, params: {token: string, password: string}): Promise<void> {
	if (params.token !== '1234') {
		throw new Error('invalid token. try query ?token=1234');
	}

	log(context, 'POST', '/change-password', params);
}

export async function updateUser(context: IRestApiContext, params: IUser): Promise<IUser> {
	log(context, 'PATCH', `/user/${params.id}`, params as unknown as IDataObject);
	const user = getCurrUser();
	removeUser(params.id);
	addUser({
		...user,
		...params,
	});

	return await Promise.resolve(params);
}

export async function updateUserPassword(context: IRestApiContext, params: {id: string, password: string}): Promise<void> {
	log(context, 'PATCH', `/user/${params.id}/password`, {password: params.password});
}

export async function deleteUser(context: IRestApiContext, {id, transferId}: {id: string, transferId?: string}): Promise<void> {
	log(context, 'DELETE', `/user/${id}`, transferId ? { transferId } : {});
	removeUser(id);
}

export async function getUsers(context: IRestApiContext): Promise<IUser[]> {
	log(context, 'GET', '/users');

	return Promise.resolve(getAllUsers());
}

export async function inviteUsers(context: IRestApiContext, params: {emails: string[], role: string}): Promise<IUser[]> {
	log(context, 'POST', '/invite', params);

	const users: IUser[] = params.emails.map((email: string) => ({
		id: getRandomId(),
		email,
		globalRole: {
			name: 'member',
			id: '2',
		},
	}));
	users.forEach((user: IUser) => addUser(user));

	return await Promise.resolve(users);
}

export async function reinvite(context: IRestApiContext, params: {id: string}): Promise<void> {
	log(context, 'POST', '/reinvite', params);
}

