export default {
	name: 'User',
	table: {
		name: 'user',
	},
	columns: {
		id: {
			type: Number,
			primary: true,
			generated: true,
		},
		firstName: {
			type: String,
			nullable: false,
		},
		secondName: {
			type: String,
			nullable: false,
		},
	},
};
