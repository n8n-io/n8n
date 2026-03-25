<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import VueMarkdown, { Options } from '../../dist/VueMarkdown'
import { ref } from 'vue'

const i = ref(0)
const options: Options = { html: true }
</script>

<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  <button type="button" @click="i++">Increment</button>
  <vue-markdown
    :source="`# This is a markdown heading\n## This is your number: ${i}.\n<i>HTML is allowed via options</i>`"
    :options="options"
  ></vue-markdown>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
