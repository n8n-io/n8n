			const foundTriggers = this.$store.getters.worklfowEnabledTriggerNodes
				.map(({ type }: INodeUi) => this.$store.getters.nodeType(type));
