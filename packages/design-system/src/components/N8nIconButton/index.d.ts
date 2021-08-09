import { N8nComponent, N8nComponentSize } from "../component";

/** Icon Button Component */
export declare class N8nIconButton extends N8nComponent {
  /** Button title on hover */
  title: string;

  /** Button size */
  size: N8nComponentSize | "xl";

  /** icon size */
  iconSize: N8nComponentSize;

  /** Determine whether it's loading */
  loading: boolean;

  /** Disable the button */
  disabled: boolean;

  /** Button icon, accepts an icon name of font awesome icon component */
  icon: string;
}
