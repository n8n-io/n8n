import { defineComponent, h } from 'vue'
import { hasOwn, hyphenate } from '@vue/shared'

export default defineComponent({
  name: 'github-button',
  props: {
    href: String,
    ariaLabel: String,
    title: String,
    dataIcon: String,
    dataColorScheme: String,
    dataSize: String,
    dataShowCount: String,
    dataText: String
  },
  render: function () {
    const props = { ref: '_' }
    for (const key in this.$props) {
      props[hyphenate(key)] = this.$props[key]
    }
    return h('span', [
      hasOwn(this.$slots, 'default')
        ? h('a', props, this.$slots.default())
        : h('a', props)
    ])
  },
  mounted: function () {
    this.paint()
  },
  beforeUpdate: function () {
    this.reset()
  },
  updated: function () {
    this.paint()
  },
  beforeUnmount: function () {
    this.reset()
  },
  methods: {
    paint: function () {
      if (this.$el.lastChild !== this.$refs._) {
        return
      }
      const _ = this.$el.appendChild(document.createElement('span'))
      const _this = this
      import(/* webpackMode: "eager" */ 'github-buttons').then(function (module) {
        if (_this.$el.lastChild !== _) {
          return
        }
        module.render(_.appendChild(_this.$refs._), function (el) {
          if (_this.$el.lastChild !== _) {
            return
          }
          _.parentNode.replaceChild(el, _)
        })
      })
    },
    reset: function () {
      if (this.$refs._ == null) {
        return
      }
      this.$el.replaceChild(/** @type {HTMLAnchorElement} */ (this.$refs._), this.$el.lastChild)
    }
  }
})
