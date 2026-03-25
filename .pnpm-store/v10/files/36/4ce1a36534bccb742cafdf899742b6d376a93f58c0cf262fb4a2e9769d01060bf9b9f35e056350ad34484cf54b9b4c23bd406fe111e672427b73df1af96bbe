declare module 'vite-svg-loader' {
  import { Plugin } from 'vite'
  import { Config } from 'svgo'
  function svgLoader(options?: { svgoConfig?: Config, svgo?: boolean, defaultImport?: 'url' | 'raw' | 'component' }): Plugin
  export default svgLoader
}

declare module '*.svg?component' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const src: FunctionalComponent<SVGAttributes>
  export default src
}

declare module '*.svg?url' {
  const src: string
  export default src
}

declare module '*.svg?raw' {
  const src: string
  export default src
}

declare module '*.svg?skipsvgo' {
  import { FunctionalComponent, SVGAttributes } from 'vue'
  const src: FunctionalComponent<SVGAttributes>
  export default src
}
