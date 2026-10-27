module.exports = [
	{
		type: 'sqlite',
		name: 'file',
		database: 'test',
	},
	{
		type: 'sqlite',
		name: 'memory',
		database: ':memory:',
	},
	{
		type: 'sqlite-pooled',
		name: 'sqlite-pooled-file',
		database: 'sqlite-pooled.db',
	},
	{
		type: 'sqlite-pooled',
		name: 'sqlite-pooled-memory',
		database: ':memory:',
	},
];
