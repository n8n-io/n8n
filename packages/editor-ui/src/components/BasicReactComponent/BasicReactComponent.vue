<template>
  <Basic />
</template>
<script>
import {applyReactInVue} from 'veaury';
// This is a React component
import BasicReactComponent from './react_app/BasicReactComponent.jsx';
import {ref} from 'vue';

export default {
	components: {
		// Use HOC 'applyReactInVue'
		Basic: applyReactInVue(BasicReactComponent),
	},
};
</script>
