import { NextFunction, Request, Response } from 'express';

const sayHello = (req: Request, res: Response, next: NextFunction): void => {
	console.log('hello');
	console.log('se llamo esta vegra');
	next();
};

export const middlewares = {
	getUsers: [sayHello],
	getUser: [sayHello],
};
