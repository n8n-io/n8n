import type { BindingContext } from 'samlify/types/src/entity';

export function getInitSSOPostView(context: BindingContext): string {
	return `
  <html></html>
  <script type="text/javascript">
    // Automatic redirect
    (function(){
        location.href = "${context.context}";
    })();
  </script>`;
}
