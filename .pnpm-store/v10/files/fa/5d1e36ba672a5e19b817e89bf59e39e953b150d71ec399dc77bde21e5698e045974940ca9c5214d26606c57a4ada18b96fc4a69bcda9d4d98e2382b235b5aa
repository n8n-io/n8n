import '../../../utils/index.mjs';
import { buildProps, definePropType } from '../../../utils/vue/props/runtime.mjs';

const statisticProps = buildProps({
  decimalSeparator: {
    type: String,
    default: "."
  },
  groupSeparator: {
    type: String,
    default: ","
  },
  precision: {
    type: Number,
    default: 0
  },
  formatter: Function,
  value: {
    type: definePropType([Number, Object]),
    default: 0
  },
  prefix: String,
  suffix: String,
  title: String,
  valueStyle: {
    type: definePropType([String, Object, Array])
  }
});

export { statisticProps };
//# sourceMappingURL=statistic.mjs.map
