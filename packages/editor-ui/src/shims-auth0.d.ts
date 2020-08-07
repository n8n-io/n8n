import { VueAuth } from './auth/VueAuth'
declare module 'vue/types/vue' {
  interface Vue {
    $auth: VueAuth
  }
}