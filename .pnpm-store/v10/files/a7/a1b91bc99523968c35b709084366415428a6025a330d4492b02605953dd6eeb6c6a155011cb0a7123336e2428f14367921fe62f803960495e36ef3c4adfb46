function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}

export default function() {
  return this.each(raise);
}
