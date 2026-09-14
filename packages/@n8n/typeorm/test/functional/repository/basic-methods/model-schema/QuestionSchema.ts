export default {
	name: 'Question',
	table: {
		name: 'question',
	},
	columns: {
		id: {
			type: Number,
			primary: true,
			generated: true,
		},
		title: {
			type: String,
			nullable: false,
		},
	},
	target: function Question(this: any) {
		this.type = 'question';
	},
};
