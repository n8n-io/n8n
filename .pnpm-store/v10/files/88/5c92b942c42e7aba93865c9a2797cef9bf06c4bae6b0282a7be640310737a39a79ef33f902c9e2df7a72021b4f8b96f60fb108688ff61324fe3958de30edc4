// Project: https://github.com/alasql/alasql

declare module 'alasql' {
	import * as xlsx from 'xlsx';

	interface AlaSQLCallback {
		(data?: any, err?: Error): void;
	}

	interface AlaSQLOptions {
		errorlog: boolean;
		valueof: boolean;
		dropifnotexists: boolean; // drop database in any case
		datetimeformat: string; // how to handle DATE and DATETIME types
		casesensitive: boolean; // table and column names are case sensitive and converted to lower-case
		logtarget: string; // target for log. Values: 'console', 'output', 'id' of html tag
		logprompt: boolean; // print SQL at log
		modifier: any; // values: RECORDSET, VALUE, ROW, COLUMN, MATRIX, TEXTSTRING, INDEX
		columnlookup: number; // how many rows to lookup to define columns
		autovertex: boolean; // create vertex if not found
		usedbo: boolean; // use dbo as current database (for partial T-SQL comaptibility)
		autocommit: boolean; // the AUTOCOMMIT ON | OFF
		cache: boolean; // use cache
		nocount: boolean; // for SET NOCOUNT OFF
		nan: boolean; // check for NaN and convert it to undefined
		angularjs: boolean;
		tsql: boolean;
		mysql: boolean;
		postgres: boolean;
		oracle: boolean;
		sqlite: boolean;
		orientdb: boolean;
		excel: any;
	}

	// compiled Statement
	interface AlaSQLStatement {
		(params?: any, cb?: AlaSQLCallback, scope?: any): any;
	}

	// abstract Syntax Tree
	interface AlaSQLAST {
		compile(databaseid: string): AlaSQLStatement;
	}

	// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/es6-promise/es6-promise.d.ts
	interface Thenable<T> {
		then<U>(
			onFulfilled?: (value: T) => U | Thenable<U>,
			onRejected?: (error: any) => U | Thenable<U>
		): Thenable<U>;
		then<U>(
			onFulfilled?: (value: T) => U | Thenable<U>,
			onRejected?: (error: any) => void
		): Thenable<U>;
		catch<U>(onRejected?: (error: any) => U | Thenable<U>): Thenable<U>;
	}

	// see https://github.com/alasql/alasql/wiki/User%20Defined%20Functions
	interface userDefinedFunction {
		(...x: any[]): any;
	}

	interface userDefinedFunctionLookUp {
		[x: string]: userDefinedFunction;
	}

	// see https://github.com/alasql/alasql/wiki/User%20Defined%20Functions
	interface userAggregator {
		(value: any, accumulator: any, stage: number): any;
	}

	interface userAggregatorLookUp {
		[x: string]: userAggregator;
	}

	interface userFromFunction {
		(dataReference: any, options: any, callback: any, index: any, query: any): any;
	}

	interface userFromFunctionLookUp {
		[x: string]: userFromFunction;
	}

	/**
	 * AlaSQL database object. This is a lightweight implimentation
	 *
	 * @interface database
	 */
	interface database {
		/**
		 * The database ID.
		 *
		 * @type {string}
		 * @memberof database
		 */
		databaseid: string;

		/**
		 * The collection of tables in the database.
		 *
		 * @type {tableLookUp}
		 * @memberof database
		 */
		tables: tableLookUp;
	}

	/**
	 * AlaSQL table object. This is a lightweight implimentation
	 *
	 * @interface table
	 */
	interface table {
		/**
		 * The array of data stored in the table which can be queried
		 *
		 * @type {any[]}
		 * @memberof table
		 */
		data: any[];
	}

	/**
	 * AlaSQL database dictionary
	 *
	 * @interface databaseLookUp
	 */
	interface databaseLookUp {
		[databaseName: string]: database;
	}

	/**
	 * AlaSQL table dictionary
	 *
	 * @interface tableLookUp
	 */
	interface tableLookUp {
		[tableName: string]: table;
	}

	interface Database {
		databaseid: string;
		dbversion: number;
		tables: {[key: string]: any};
		views: {[key: string]: any};
		triggers: {[key: string]: any};
		indices: {[key: string]: any};
		objects: {[key: string]: any};
		counter: number;
		sqlCache: {[key: string]: any};
		sqlCacheSize: number;
		astCache: {[key: string]: any};
		resetSqlCache: () => void;
		exec: (sql: string, params?: object, cb?: Function) => any;
		autoval: (tablename: string, colname: string, getNext: boolean) => any;
	}
	interface AlaSQL {
		options: AlaSQLOptions;
		error: Error;
		(sql: any, params?: any, cb?: AlaSQLCallback, scope?: any): any;
		parse(sql: any): AlaSQLAST;
		promise(sql: any, params?: any): Thenable<any>;
		fn: userDefinedFunctionLookUp;
		from: userFromFunctionLookUp;
		aggr: userAggregatorLookUp;
		autoval(tablename: string, colname: string, getNext?: boolean): number;
		yy: {};
		setXLSX(xlsxlib: typeof xlsx): void;
		Database: Database;

		/**
		 * Array of databases in the AlaSQL object.
		 *
		 * @type {databaseLookUp}
		 * @memberof AlaSQL
		 */
		databases: databaseLookUp;

		/**
		 * Equivalent to alasql('USE '+databaseid). This will change the current
		 * database to the one specified. This will update the useid property and
		 * the tables property.
		 *
		 * @param {string} databaseid
		 * @memberof AlaSQL
		 */
		use(databaseid: string): void;

		/**
		 * The current database ID. If no database is selected, this is the
		 * default database ID (called alasql).
		 *
		 * @type {string}
		 * @memberof AlaSQL
		 */
		useid: string;

		/**
		 * Array of the tables in the default database (called alasql). If
		 * the database is changes via a USE statement or the use method, this
		 * becomes the tables in the new database.
		 *
		 * @type {tableLookUp}
		 * @memberof AlaSQL
		 */
		tables: tableLookUp;
	}

	const alasql: AlaSQL;

	export = alasql;
}
