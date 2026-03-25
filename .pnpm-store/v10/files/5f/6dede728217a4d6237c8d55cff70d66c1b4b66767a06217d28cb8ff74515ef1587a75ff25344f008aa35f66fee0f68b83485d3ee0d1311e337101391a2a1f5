import '../../utils/index.mjs';
import Container from './src/container.mjs';
import Aside from './src/aside.mjs';
import Footer from './src/footer.mjs';
import Header from './src/header.mjs';
import Main from './src/main.mjs';
import { withInstall, withNoopInstall } from '../../utils/vue/install.mjs';

const ElContainer = withInstall(Container, {
  Aside,
  Footer,
  Header,
  Main
});
const ElAside = withNoopInstall(Aside);
const ElFooter = withNoopInstall(Footer);
const ElHeader = withNoopInstall(Header);
const ElMain = withNoopInstall(Main);

export { ElAside, ElContainer, ElFooter, ElHeader, ElMain, ElContainer as default };
//# sourceMappingURL=index.mjs.map
